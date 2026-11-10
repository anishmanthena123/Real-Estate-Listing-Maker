import 'server-only';
import { parseAddress, type AddressParts } from '../../shared/address';
import { z } from 'zod';
import { getEnv } from '../env';
import { AppError } from '../errors';
import { boundedBody } from '../http';
export type PropertySuggestions = AddressParts & {
  price: null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  propertyType: string | null;
  yearBuilt: number | null;
  lotSize: number | null;
};
export type LookupResult = {
  source: 'ATTOM';
  retrievedAt: string;
  requestedAddress: string;
  matchedAddress: string;
  requiresReview: true;
  suggestedFacts: PropertySuggestions;
  notice: string;
};
export interface PropertyLookupProvider {
  lookup(address: string): Promise<LookupResult>;
}
export function parseLookupAddress(value: string): AddressParts {
  try {
    return parseAddress(value);
  } catch (error) {
    throw new AppError(400, (error as Error).message);
  }
}
const numeric = z
  .union([
    z.number().finite(),
    z
      .string()
      .regex(/^\d+(?:\.\d+)?$/)
      .transform(Number),
  ])
  .nullish()
  .transform((v) => v ?? null);
const recordSchema = z.object({
  address: z
    .object({
      line1: z.string().max(200).nullish(),
      locality: z.string().max(100).nullish(),
      countrySubd: z.string().max(100).nullish(),
      postal1: z.string().max(20).nullish(),
    })
    .nullish(),
  building: z
    .object({
      rooms: z
        .object({ beds: numeric, bathsTotal: numeric, bathstotal: numeric })
        .nullish(),
      size: z.object({ livingsize: numeric }).nullish(),
    })
    .nullish(),
  summary: z
    .object({ yearbuilt: numeric, proptype: z.string().nullish() })
    .nullish(),
  lot: z.object({ lotsize2: numeric }).nullish(),
});
const bounded = (n: number | null | undefined, max: number, integer = false) =>
  n != null && n >= 0 && n <= max && (!integer || Number.isInteger(n))
    ? n
    : null;
const propertyTypes: Record<string, string> = {
  SFR: 'House',
  'SINGLE FAMILY RESIDENCE': 'House',
  'SINGLE FAMILY': 'House',
  CONDOMINIUM: 'Condo',
  CONDO: 'Condo',
  TOWNHOUSE: 'Townhouse',
  DUPLEX: 'Multi-family',
  TRIPLEX: 'Multi-family',
  'VACANT LAND': 'Land',
};
export class AttomPropertyProvider implements PropertyLookupProvider {
  constructor(private key: string) {}
  async lookup(address: string): Promise<LookupResult> {
    const requested = parseLookupAddress(address);
    const url = new URL(
      'https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail',
    );
    url.searchParams.set('address1', requested.address);
    url.searchParams.set(
      'address2',
      `${requested.city}, ${requested.state} ${requested.zipCode}`,
    );
    let body: unknown;
    try {
      const response = await fetch(url, {
        headers: { apikey: this.key, accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      });
      if (response.status === 404)
        throw new AppError(
          404,
          'No property record found. Enter the facts manually or check the address.',
        );
      if (!response.ok) throw new Error('Provider unavailable');
      body = JSON.parse(
        new TextDecoder().decode(await boundedBody(response, 512 * 1024)),
      );
    } catch (error) {
      if (error instanceof AppError && error.status === 404) throw error;
      throw new AppError(
        502,
        'Property lookup is unavailable. Check provider access or try again later; you can enter details manually.',
      );
    }
    const envelope = z
      .object({ property: z.array(recordSchema).max(20) })
      .safeParse(body);
    if (!envelope.success)
      throw new AppError(
        502,
        'Property provider returned an unexpected response. Enter facts manually or try again.',
      );
    if (!envelope.data.property.length)
      throw new AppError(
        404,
        'No property record found. Check the address or enter facts manually.',
      );
    if (envelope.data.property.length !== 1)
      throw new AppError(
        409,
        'The address matched multiple records. Include the unit number or enter facts manually.',
      );
    const record = envelope.data.property[0];
    if (!record.address?.line1?.trim())
      throw new AppError(
        502,
        'Property provider returned no usable address. Enter details manually.',
      );
    const rawBathrooms = bounded(
      record.building?.rooms?.bathstotal ?? record.building?.rooms?.bathsTotal,
      100,
    );
    const bathrooms =
      rawBathrooms !== null &&
      Math.abs(rawBathrooms * 10 - Math.round(rawBathrooms * 10)) < 1e-9
        ? rawBathrooms
        : null;
    const suggested: PropertySuggestions = {
      address: record.address?.line1?.trim() || requested.address,
      city: record.address?.locality?.trim() || requested.city,
      state: record.address?.countrySubd?.trim() || requested.state,
      zipCode: record.address?.postal1?.trim() || requested.zipCode,
      // Public-record assessed/AVM/sale values are NOT current listing prices.
      price: null,
      bedrooms: bounded(record.building?.rooms?.beds, 100, true),
      bathrooms,
      squareFeet: bounded(record.building?.size?.livingsize, 10000000, true),
      yearBuilt:
        record.summary?.yearbuilt != null && record.summary.yearbuilt >= 1600
          ? bounded(
              record.summary.yearbuilt,
              new Date().getUTCFullYear() + 5,
              true,
            )
          : null,
      propertyType:
        propertyTypes[record.summary?.proptype?.toUpperCase() ?? ''] ?? null,
      lotSize: bounded(record.lot?.lotsize2, 999999999999),
    };
    return {
      source: 'ATTOM',
      retrievedAt: new Date().toISOString(),
      requestedAddress: address.trim(),
      matchedAddress: `${suggested.address}, ${suggested.city}, ${suggested.state} ${suggested.zipCode}`,
      requiresReview: true,
      suggestedFacts: suggested,
      notice:
        'Public-record suggestions may be stale or match a different unit. Confirm the returned address and every field. Provide the current listing price only if known; missing values are not inferred.',
    };
  }
}
export function getLookupProvider(): PropertyLookupProvider {
  const env = getEnv();
  if (env.PROPERTY_LOOKUP_PROVIDER !== 'attom' || !env.ATTOM_API_KEY?.trim())
    throw new AppError(
      503,
      'Automatic lookup is not enabled on this website. Continue with address only or enter details manually.',
    );
  return new AttomPropertyProvider(env.ATTOM_API_KEY);
}
