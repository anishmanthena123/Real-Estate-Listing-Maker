import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AttomPropertyProvider,
  getLookupProvider,
  parseLookupAddress,
} from '../src/server/lookup/provider';
import { productionConfig } from '../scripts/production-config';
const address = '123 Oak Street, Austin, TX 78701';
const record = {
  address: {
    line1: '123 OAK ST',
    locality: 'Austin',
    countrySubd: 'TX',
    postal1: '78701',
  },
  building: { rooms: { beds: 3, bathstotal: 2.5 }, size: { livingsize: 1800 } },
  summary: { yearbuilt: 2005, proptype: 'SFR' },
  lot: { lotsize2: 5000 },
  assessment: { market: { mktttlvalue: 700000 } },
  sale: { amount: { saleamt: 650000 } },
};
const respond = (body: unknown, status = 200) => {
  const fetcher = vi.fn().mockResolvedValue(Response.json(body, { status }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('ATTOM public-record adapter', () => {
  it('encodes address parameters and keeps the key out of the URL and result', async () => {
    const fetcher = respond({ property: [record] });
    const result = await new AttomPropertyProvider('secret-test-key').lookup(
      address,
    );
    const [url, options] = fetcher.mock.calls[0];
    expect(url.hostname).toBe('api.gateway.attomdata.com');
    expect(url.searchParams.get('address1')).toBe('123 Oak Street');
    expect(url.toString()).not.toContain('secret-test-key');
    expect(options.headers.apikey).toBe('secret-test-key');
    expect(options.redirect).toBe('error');
    expect(JSON.stringify(result)).not.toContain('secret-test-key');
  });
  it('maps explicit provider numeric fields and returns provenance for human review', async () => {
    respond({ property: [record] });
    const result = await new AttomPropertyProvider('test').lookup(address);
    expect(result).toMatchObject({
      source: 'ATTOM',
      requiresReview: true,
      suggestedFacts: {
        bedrooms: 3,
        bathrooms: 2.5,
        squareFeet: 1800,
        yearBuilt: 2005,
        lotSize: 5000,
        propertyType: 'House',
      },
    });
    expect(Number.isNaN(Date.parse(result.retrievedAt))).toBe(false);
  });
  it('never treats assessed value or a past sale as the listing price', async () => {
    respond({ property: [record] });
    expect(
      (await new AttomPropertyProvider('test').lookup(address)).suggestedFacts
        .price,
    ).toBeNull();
  });
  it('leaves missing fields unknown rather than zero', async () => {
    respond({ property: [{ address: record.address }] });
    expect(
      (await new AttomPropertyProvider('test').lookup(address)).suggestedFacts,
    ).toMatchObject({
      bedrooms: null,
      bathrooms: null,
      squareFeet: null,
      yearBuilt: null,
      propertyType: null,
      lotSize: null,
      price: null,
    });
  });
  it('accepts explicit numeric strings without coercing null to zero', async () => {
    respond({
      property: [
        {
          ...record,
          building: {
            rooms: { beds: '3', bathstotal: null },
            size: { livingsize: '1800' },
          },
        },
      ],
    });
    expect(
      (await new AttomPropertyProvider('test').lookup(address)).suggestedFacts,
    ).toMatchObject({ bedrooms: 3, bathrooms: null, squareFeet: 1800 });
  });
  it('does not infer construction age or dimensions from invalid provider values', async () => {
    respond({
      property: [
        {
          ...record,
          summary: { yearbuilt: 0 },
          building: { rooms: { beds: -1 }, size: { livingsize: -5 } },
        },
      ],
    });
    expect(
      (await new AttomPropertyProvider('test').lookup(address)).suggestedFacts,
    ).toMatchObject({
      bedrooms: null,
      squareFeet: null,
      yearBuilt: null,
      propertyType: null,
    });
  });
  it('rejects multiple matches rather than silently selecting the wrong unit', async () => {
    respond({ property: [record, record] });
    await expect(
      new AttomPropertyProvider('test').lookup(address),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('returns not-found for an empty result', async () => {
    respond({ property: [] });
    await expect(
      new AttomPropertyProvider('test').lookup(address),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('rejects unexpected response shapes', async () => {
    respond({ unexpected: 'secret' });
    await expect(
      new AttomPropertyProvider('test').lookup(address),
    ).rejects.toMatchObject({ status: 502 });
  });
  it('rejects a record without a usable provider address', async () => {
    respond({ property: [{}] });
    await expect(
      new AttomPropertyProvider('test').lookup(address),
    ).rejects.toMatchObject({ status: 502 });
  });
  it('hides authorization, billing and provider error bodies', async () => {
    respond({ error: 'private-key-and-account-details' }, 401);
    await expect(
      new AttomPropertyProvider('test').lookup(address),
    ).rejects.toThrow('Property lookup is unavailable');
  });
  it('handles provider timeouts without leaking raw transport details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('private-network-detail')),
    );
    await expect(
      new AttomPropertyProvider('test').lookup(address),
    ).rejects.toThrow('Property lookup is unavailable');
  });
});
describe('lookup configuration and address parsing', () => {
  it('splits one complete address into provider fields', () => {
    expect(parseLookupAddress(address)).toEqual({
      address: '123 Oak Street',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
    });
  });
  it.each([
    '',
    '123 Oak Street',
    '123 Oak Street, Austin',
    'https://example.com',
  ])('rejects an incomplete lookup address: %s', (value) => {
    expect(() => parseLookupAddress(value)).toThrow('Use Street address');
  });
  it('returns an actionable error if automatic lookup is disabled', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    vi.stubEnv('PROPERTY_LOOKUP_PROVIDER', 'disabled');
    expect(() => getLookupProvider()).toThrow(
      'Automatic lookup is not enabled',
    );
  });
  it('does not substitute mock facts for a missing provider key', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    vi.stubEnv('PROPERTY_LOOKUP_PROVIDER', 'attom');
    vi.stubEnv('ATTOM_API_KEY', '');
    expect(() => getLookupProvider()).toThrow(
      'Automatic lookup is not enabled',
    );
  });
  it('requires the lookup key before a configured production deployment starts', () => {
    expect(() =>
      productionConfig({
        DATABASE_URL: 'postgresql://localhost/test',
        APP_ORIGIN: 'https://listly.example',
        AI_API_KEY: 'test',
        PROPERTY_LOOKUP_PROVIDER: 'attom',
      }),
    ).toThrow('Set ATTOM_API_KEY');
  });
});

it('does not round unsupported quarter-bath values into a different fact', async () => {
  respond({
    property: [
      { ...record, building: { rooms: { beds: 3, bathstotal: 2.25 } } },
    ],
  });
  expect(
    (await new AttomPropertyProvider('test').lookup(address)).suggestedFacts
      .bathrooms,
  ).toBeNull();
});

it('keeps an apartment/unit with the street instead of treating it as the city', () => {
  expect(parseLookupAddress('123 Oak Street, Apt 4, Austin, TX 78701')).toEqual(
    {
      address: '123 Oak Street, Apt 4',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
    },
  );
});
