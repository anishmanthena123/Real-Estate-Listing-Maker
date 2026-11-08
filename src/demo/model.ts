import { buildContext, type GroundingProperty } from '../server/ai/grounding';
import { factSentences, validateClaims } from '../server/ai/claims';
export type Feature = {
  label: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
};
export type SampleProperty = GroundingProperty & {
  id: string;
  name: string;
  features: Feature[];
  tag: string;
  isSample?: boolean;
};
export type Draft = {
  id: number;
  propertyId: string;
  text: string;
  type: string;
  style: string;
  length: string;
  status: 'DRAFT' | 'NEEDS_REVIEW' | 'READY';
  feedback?: number;
};
export const samples: SampleProperty[] = [
  {
    id: 'willow',
    name: 'The Willow House',
    address: '128 Willow Lane',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    price: '685000',
    bedrooms: 3,
    bathrooms: '2',
    squareFeet: 2140,
    propertyType: 'House',
    yearBuilt: 2017,
    lotSize: '6400',
    tag: 'Contemporary living',
    features: [
      { label: 'kitchen island', status: 'PENDING' },
      { label: 'large windows', status: 'PENDING' },
      { label: 'pool', status: 'PENDING' },
    ],
  },
  {
    id: 'maple',
    name: 'Maple Row Townhome',
    address: '42 Maple Row',
    city: 'Portland',
    state: 'OR',
    zipCode: '97214',
    price: '529000',
    bedrooms: 2,
    bathrooms: '2.5',
    squareFeet: 1680,
    propertyType: 'Townhouse',
    yearBuilt: 2020,
    lotSize: '1800',
    tag: 'A considered footprint',
    features: [
      { label: 'garage', status: 'PENDING' },
      { label: 'patio', status: 'PENDING' },
    ],
  },
  {
    id: 'cedar',
    name: 'Cedar Park Residence',
    address: '9 Cedar Way',
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27601',
    price: '472000',
    bedrooms: 4,
    bathrooms: '3',
    squareFeet: 2450,
    propertyType: 'House',
    yearBuilt: 2009,
    lotSize: '8200',
    tag: 'Room to make it yours',
    features: [
      { label: 'fireplace', status: 'PENDING' },
      { label: 'hardwood-style flooring', status: 'PENDING' },
    ],
  },
];
export const freshProperties = () =>
  structuredClone(samples).map((p) => ({ ...p, isSample: true }));
export function demoContext(property: SampleProperty) {
  return buildContext(property, property.features);
}
export function generateDemo(
  property: SampleProperty,
  length: string,
  type: string,
) {
  const facts = factSentences(demoContext(property));
  const selected = facts.filter(
    (fact, index) =>
      index <
        (length === 'Short' ? 4 : length === 'Medium' ? 7 : facts.length) ||
      fact.evidence.startsWith('verified feature:'),
  );
  return selected
    .map((f) => `${f.text}.`)
    .join(type === 'MLS description' ? ' ' : '\n');
}
export function reviewDemo(property: SampleProperty, text: string) {
  return validateClaims(text, demoContext(property));
}
export function canMarkReady(
  property: SampleProperty,
  text: string,
  acknowledged: boolean,
) {
  const claims = reviewDemo(property, text);
  return (
    acknowledged &&
    claims.length > 0 &&
    claims.every((c) => c.status === 'SUPPORTED')
  );
}

const normalizeAddress = (value: string) =>
  value.toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
export function resolveDemoAddress(
  value: string,
  existing: SampleProperty[],
): SampleProperty {
  const address = value.trim().replace(/\s+/g, ' ');
  if (address.length < 5 || address.length > 300 || !/\p{L}/u.test(address))
    throw new Error('Enter an address between 5 and 300 characters.');
  const key = normalizeAddress(address);
  const match = existing.find((p) =>
    [p.address, `${p.address}, ${p.city}, ${p.state} ${p.zipCode}`].some(
      (candidate) => normalizeAddress(candidate) === key,
    ),
  );
  if (match) return match;
  // An address is not evidence of price, dimensions, age, amenities, or photos.
  return {
    id: `address-${crypto.randomUUID()}`,
    name: address,
    address,
    city: '',
    state: '',
    zipCode: '',
    price: null,
    bedrooms: null,
    bathrooms: null,
    squareFeet: null,
    propertyType: null,
    yearBuilt: null,
    lotSize: null,
    features: [],
    tag: 'Address entered by you',
    isSample: false,
  };
}
