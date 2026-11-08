import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  freshProperties,
  resolveDemoAddress,
  demoContext,
  generateDemo,
  reviewDemo,
} from '../src/demo/model';
import {
  validateLocalPhoto,
  MAX_LOCAL_PHOTO_BYTES,
} from '../src/demo/local-photos';
import sharp from 'sharp';
afterEach(() => vi.unstubAllGlobals());
describe('address-only entry without invented property facts', () => {
  it('finds only an exact normalized fictional sample address', () => {
    const result = resolveDemoAddress(
      ' 128 Willow Lane, Austin, TX 78704 ',
      freshProperties(),
    );
    expect(result.id).toBe('willow');
    expect(result.isSample).toBe(true);
  });
  it('keeps existing verification decisions when reopening an address', () => {
    const properties = freshProperties();
    properties[0].features[0].status = 'VERIFIED';
    expect(
      resolveDemoAddress('128 willow lane', properties).features[0].status,
    ).toBe('VERIFIED');
  });
  it('does not attach a nearby sample record to an unknown address', () => {
    const result = resolveDemoAddress(
      '129 Willow Lane, Austin, TX 78704',
      freshProperties(),
    );
    expect(result.isSample).toBe(false);
    expect(result.price).toBeNull();
    expect(result.features).toEqual([]);
  });
  it('generates only the user-provided location when other facts are unknown', () => {
    const property = resolveDemoAddress(
      '900 Test Avenue, Example City',
      freshProperties(),
    );
    const text = generateDemo(property, 'Long', 'MLS description');
    expect(text).toBe('Located at 900 Test Avenue, Example City.');
    expect(demoContext(property).property).toMatchObject({
      price: null,
      bedrooms: null,
      bathrooms: null,
      squareFeet: null,
      yearBuilt: null,
      propertyType: null,
    });
    expect(text).not.toMatch(
      /null|undefined|bedrooms|bathrooms|Listed|Built|square feet/,
    );
  });
  it('unknown facts cannot support a zero-valued or invented numeric claim', () => {
    const property = resolveDemoAddress('900 Test Avenue', freshProperties());
    expect(
      reviewDemo(property, '0 bedrooms. Listed at $685000.').every(
        (c) => c.status === 'UNVERIFIED',
      ),
    ).toBe(true);
  });
  it.each(['', '   ', '12', '12345', 'x'.repeat(301)])(
    'rejects invalid address input %s',
    (address) => {
      expect(() => resolveDemoAddress(address, freshProperties())).toThrow(
        'Enter an address',
      );
    },
  );
});
describe('local image import validation', () => {
  it('rejects executable SVG and other unsupported MIME types', async () => {
    await expect(
      validateLocalPhoto(
        new File(['<svg/>'], 'photo.svg', { type: 'image/svg+xml' }),
      ),
    ).rejects.toThrow('JPEG');
  });
  it('rejects images above the size limit before decoding', async () => {
    await expect(
      validateLocalPhoto(
        new File([new Uint8Array(MAX_LOCAL_PHOTO_BYTES + 1)], 'large.jpg', {
          type: 'image/jpeg',
        }),
      ),
    ).rejects.toThrow('8 MB');
  });
  it('rejects empty pictures', async () => {
    await expect(
      validateLocalPhoto(new File([], 'empty.png', { type: 'image/png' })),
    ).rejects.toThrow('nonempty');
  });
  it('rejects spoofed picture content', async () => {
    await expect(
      validateLocalPhoto(
        new File(['not a photo'], 'fake.jpg', { type: 'image/jpeg' }),
      ),
    ).rejects.toThrow('does not match');
  });
  it('rejects a valid PNG declared as JPEG', async () => {
    const bytes = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    await expect(
      validateLocalPhoto(
        new File([new Uint8Array(bytes)], 'wrong.jpg', { type: 'image/jpeg' }),
      ),
    ).rejects.toThrow('does not match');
  });
  it('rejects decoding failures even when the signature matches', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('invalid')),
    );
    await expect(
      validateLocalPhoto(
        new File([new Uint8Array([255, 216, 255, 0])], 'broken.jpg', {
          type: 'image/jpeg',
        }),
      ),
    ).rejects.toThrow('could not be decoded');
  });
  it('releases the decoded bitmap after validation', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 640, height: 480, close }),
    );
    await expect(
      validateLocalPhoto(
        new File([new Uint8Array([255, 216, 255, 0])], 'test.jpg', {
          type: 'image/jpeg',
        }),
      ),
    ).resolves.toEqual({ width: 640, height: 480 });
    expect(close).toHaveBeenCalledOnce();
  });
  it('rejects excessive pixel dimensions and releases the bitmap', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 10000, height: 10000, close }),
    );
    await expect(
      validateLocalPhoto(
        new File([new Uint8Array([255, 216, 255, 0])], 'big.jpg', {
          type: 'image/jpeg',
        }),
      ),
    ).rejects.toThrow('40 megapixel');
    expect(close).toHaveBeenCalledOnce();
  });
});
